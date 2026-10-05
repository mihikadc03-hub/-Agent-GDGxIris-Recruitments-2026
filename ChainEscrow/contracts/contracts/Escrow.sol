// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    enum MilestoneState { Pending, Submitted, Approved, Disputed, Resolved }
    
    struct Milestone {
        uint256 amount;
        MilestoneState state;
    }
    
    struct Job {
        uint256 id;
        address client;
        address freelancer;
        address arbiter;
        uint256 totalDeposit;
        Milestone[] milestones;
    }
    
    uint256 public jobCounter;
    mapping(uint256 => Job) public jobs;
    
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer);
    event MilestoneSubmitted(uint256 indexed jobId, uint256 milestoneId);
    event MilestoneApproved(uint256 indexed jobId, uint256 milestoneId);
    event DisputeRaised(uint256 indexed jobId, uint256 milestoneId);
    event DisputeResolved(uint256 indexed jobId, uint256 milestoneId, uint256 clientShare, uint256 freelancerShare);

    function createJob(address _freelancer, address _arbiter, uint256[] calldata _milestoneAmounts) external payable {
        require(_milestoneAmounts.length >= 2, "Need at least 2 milestones");
        uint256 sum = 0;
        for (uint i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            sum += _milestoneAmounts[i];
        }
        require(msg.value == sum, "Deposit must equal sum of milestones");
        
        Job storage job = jobs[jobCounter];
        job.id = jobCounter;
        job.client = msg.sender;
        job.freelancer = _freelancer;
        job.arbiter = _arbiter;
        job.totalDeposit = msg.value;
        
        for (uint i = 0; i < _milestoneAmounts.length; i++) {
            job.milestones.push(Milestone({
                amount: _milestoneAmounts[i],
                state: MilestoneState.Pending
            }));
        }
        
        emit JobCreated(jobCounter, msg.sender, _freelancer);
        jobCounter++;
    }

    function submitMilestone(uint256 _jobId, uint256 _milestoneId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.freelancer, "Only freelancer can submit");
        Milestone storage m = job.milestones[_milestoneId];
        require(m.state == MilestoneState.Pending, "Invalid state transition");
        
        m.state = MilestoneState.Submitted;
        emit MilestoneSubmitted(_jobId, _milestoneId);
    }

    function approveMilestone(uint256 _jobId, uint256 _milestoneId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.client, "Only client can approve");
        Milestone storage m = job.milestones[_milestoneId];
        require(m.state == MilestoneState.Submitted, "Milestone not submitted");
        
        m.state = MilestoneState.Approved;
        
        (bool success, ) = job.freelancer.call{value: m.amount}("");
        require(success, "Transfer failed");
        
        emit MilestoneApproved(_jobId, _milestoneId);
    }
    
    function raiseDispute(uint256 _jobId, uint256 _milestoneId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.client || msg.sender == job.freelancer, "Not authorized");
        Milestone storage m = job.milestones[_milestoneId];
        require(m.state == MilestoneState.Submitted, "Cannot dispute in this state");
        
        m.state = MilestoneState.Disputed;
        emit DisputeRaised(_jobId, _milestoneId);
    }
    
    function resolveDispute(uint256 _jobId, uint256 _milestoneId, uint256 clientShare) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.arbiter, "Only arbiter can resolve");
        Milestone storage m = job.milestones[_milestoneId];
        require(m.state == MilestoneState.Disputed, "Not in dispute");
        require(clientShare <= m.amount, "Invalid share amount");
        
        m.state = MilestoneState.Resolved;
        uint256 freelancerShare = m.amount - clientShare;
        
        if (clientShare > 0) {
            (bool successC, ) = job.client.call{value: clientShare}("");
            require(successC, "Client refund failed");
        }
        if (freelancerShare > 0) {
            (bool successF, ) = job.freelancer.call{value: freelancerShare}("");
            require(successF, "Freelancer payout failed");
        }
        
        emit DisputeResolved(_jobId, _milestoneId, clientShare, freelancerShare);
    }
}
